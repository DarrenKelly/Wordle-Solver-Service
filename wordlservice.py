from string import Template
from flask import Flask, render_template, send_from_directory
from flask import request

import os
import re
import sys
import argparse
import logging

# set the project root directory as the static folder.
app = Flask(__name__, static_url_path='')


@app.route('/solve_wordle/js/<path:path>')
def send_js(path):
    return send_from_directory('static/js', path)


@app.route('/solve_wordle/img/<path:path>')
def send_img(path):
    return send_from_directory('static/img', path)


@app.route('/solve_wordle/css/<path:path>')
def send_css(path):
    return send_from_directory('static/css', path)


def match_regx(regex, candidate):
    if re.search(regex, candidate):
        return True
    return False


def count_letter_frequency_in_word(word, letter_frequencies):
    for element in range(0, len(word)):
        letter = word[element]
        if letter in letter_frequencies:
            letter_frequencies[letter] = letter_frequencies[letter] + 1
        else:
            letter_frequencies[letter] = 1
    return letter_frequencies


def count_letter_frequency_in_dictionary(dictionary_arr):
    frequencies = {}

    for element in range(0, len(dictionary_arr)):
        word = dictionary_arr[element]
        frequencies = count_letter_frequency_in_word(word, frequencies)
    return frequencies


def parse(responses):
    retval = {}
    if responses != "":
        for e in responses.split(","):
            pair = e.split('=')
            retval[pair[0]] = pair[1]
            print(f"retval[{pair[0]}] = {pair[1]}")
    return retval


def add_required_letters(required_letters, suggestion, response):
    i = 0
    for element in range(0, len(response)):
        letter = suggestion[i]
        i = i + 1
        if response[element] != 'X' and letter not in required_letters:
            required_letters = required_letters + letter
    return required_letters


def trim_allowed_words(allowed_words, suggestion, response):
    bad_letters = ""
    i = 0
    for element in range(0, len(response)):
        letter = suggestion[i]
        i = i+1
        if response[element] == 'X':
            bad_letters = bad_letters + letter

    regex = ""
    i = 0
    for element in range(0, len(response)):
        letter = suggestion[i]
        i = i + 1
        if response[element] == '@':
            regex = regex + letter
        if response[element] == 'O':
            regex = regex + f"[^{letter}{bad_letters}]"
        if response[element] == 'X':
            regex = regex + f"[^{bad_letters}]"

    print(f"regex={regex}")
    allowed_words[:] = [tup for tup in allowed_words if match_regx(regex, tup)]
    return allowed_words


def require_letters(allowed_words, required_letters):
    i = 0
    for element in range(0, len(required_letters)):
        letter = required_letters[i]
        i = i + 1
        regex = f".*{letter}.*"
        allowed_words[:] = [
            tup for tup in allowed_words if match_regx(regex, tup)]
    return allowed_words


def get_score(word, letter_frequencies):
    unique_letters = ''.join(set(word))
    score = 0
    for element in range(0, len(unique_letters)):
        letter = unique_letters[element]
        score = score + letter_frequencies[letter]
    return score


def get_suggestion(allowed_words, letter_frequencies):
    print(f"Counting {len(allowed_words)} words")
    if len(allowed_words) == 0:
        return ""
    best_word = allowed_words[0]
    top_score = 0
    for element in range(0, len(allowed_words)):
        word = allowed_words[element]
        score = get_score(word, letter_frequencies)
        if score > top_score:
            top_score = score
            best_word = word
    print(f"best_word = '{best_word}', Top score ={top_score}")
    return best_word


def ask_question(allowed_words, target_word_length, responses):
    json = json_suggestion(allowed_words, target_word_length)
    json = json + ', \n "responses": "' + responses + '"'
    json = json + ', \n "candidate_count": "' + str(len(allowed_words)) + '"'
    if len(allowed_words) < 500:
        json = json + ',\n "candidates": ["'
        for w in allowed_words:
            json = json + w
            if w != allowed_words[-1]:
                json = json + '","'
        json = json + '"]'
    return '{\n' + json + '\n}'


def json_suggestion(allowed_words, target_word_length):
    numb = len(allowed_words)
    letter_frequencies = count_letter_frequency_in_dictionary(allowed_words)
    if numb < 10:
        for el in range(0, numb):
            word = allowed_words[el]
            print(f"{word} - { get_score(word, letter_frequencies)}")
    suggestion = get_suggestion(allowed_words, letter_frequencies)
    return '"suggestion": "' + suggestion + '"'


def read_dictionary(dictionary_file):
    dictionary = []
    print("Reading dictionary")
    with open(dictionary_file) as f:
        line = f.readline()
        while line:
            dictionary.append(line.strip())
            line = f.readline()
    if(len(dictionary) == 0):
        print(f"There are no words in '{dictionary_file}'")
        exit()
    return dictionary


@app.route('/solve_wordle/')
def solve_root():
    return render_template('index.html')

# In Principle, could support words of differing length.
# Just 5 letters for now.
@app.route('/solve_wordle/<length>')
def solve_start(length):
    if length == '5':
        return solve_mid(length, "")
    return f"Length {length} not supported", 400


@app.route('/solve_wordle/<length>/<responses>')
def solve_mid(length, responses):
    previous_data = parse(responses)
    allowed_words = read_dictionary(f"{length}letters.txt")
    required_letters = ""
    for e in previous_data.keys():
        required_letters = add_required_letters(
            required_letters, e, previous_data[e])
        print(f"required_letters={required_letters}")
        print(f"#allowed_words={len(allowed_words)}")
        print(f"trim_allowed_words (, {e},{previous_data[e]})")
        allowed_words = trim_allowed_words(allowed_words, e, previous_data[e])
        print(f"#allowed_words={len(allowed_words)}")
        print(f"require_letters {required_letters}")
        allowed_words = require_letters(allowed_words, required_letters)
        print(f"#allowed_words={len(allowed_words)}")

    return ask_question(allowed_words, length, responses)
